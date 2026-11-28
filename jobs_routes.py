"""Job lifecycle API routes."""

from datetime import datetime
from flask import request, jsonify


def register_job_routes(app, db, models, helpers):
    Client = models.Client
    ServiceProvider = models.ServiceProvider
    JobRequest = models.JobRequest
    Address = models.Address
    AuditLog = models.AuditLog

    _json = helpers["_json"]
    _client_id = helpers["_client_id"]
    _sp_id = helpers["_sp_id"]
    login_required_client = helpers["login_required_client"]
    login_required_sp = helpers["login_required_sp"]
    audit = helpers["audit"]

    def _serialize_job(job):
        photos = []
        try:
            JobPhoto = getattr(models, "JobPhoto", None)
            if JobPhoto is not None:
                photos = [
                    {
                        "id": p.id,
                        "url": p.file_path or getattr(p, "url", None),
                        "caption": getattr(p, "caption", None),
                    }
                    for p in JobPhoto.query.filter_by(job_request_id=job.id).all()
                ]
        except Exception:
            photos = []

        return {
            "id": job.id,
            "job_ref": f"JOB-{job.id}",
            "client_id": job.client_id,
            "client_name": job.client_name,
            "client_phone": job.client_phone,
            "service_type": job.skill_required,
            "skill_required": job.skill_required,
            "description": job.job_description,
            "job_description": job.job_description,
            "address": job.client_address or job.job_address_text,
            "appointment_time": job.appointment_time.isoformat() if job.appointment_time else None,
            "stage": job.stage or "new",
            "status": job.status,
            "photos": photos,
            "lat": job.latitude,
            "lng": job.longitude,
            "latitude": job.latitude,
            "longitude": job.longitude,
            "province": job.province,
            "assigned_sp_id": job.assigned_sp_id,
            "pause_reason": job.pause_reason,
            "completion_notes": job.completion_notes,
            "created_at": job.created_at.isoformat() if job.created_at else None,
            "accepted_at": job.accepted_at.isoformat() if job.accepted_at else None,
            "arrived_at": job.arrived_at.isoformat() if job.arrived_at else None,
            "started_at": job.started_at.isoformat() if job.started_at else None,
            "paused_at": job.paused_at.isoformat() if job.paused_at else None,
            "resumed_at": job.resumed_at.isoformat() if job.resumed_at else None,
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }

    def _parse_dt(value):
        if value is None:
            return datetime.utcnow()
        if isinstance(value, datetime):
            return value
        s = str(value).strip()
        for fmt in (
            "%Y-%m-%dT%H:%M:%S.%fZ",
            "%Y-%m-%dT%H:%M:%SZ",
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d",
        ):
            try:
                return datetime.strptime(s.replace("Z", ""), fmt.replace("Z", "").replace(".%f", ""))
            except ValueError:
                continue
        try:
            return datetime.fromisoformat(s.replace("Z", "+00:00")).replace(tzinfo=None)
        except Exception:
            return datetime.utcnow()

    def _resolve_job_id(job_id):
        if isinstance(job_id, int) or (isinstance(job_id, str) and job_id.isdigit()):
            return int(job_id)
        s = str(job_id)
        parts = s.replace("_", "-").split("-")
        for part in reversed(parts):
            if part.isdigit():
                return int(part)
        return None

    @app.route("/api/client/jobs", methods=["GET"])
    @login_required_client
    def client_jobs_list():
        cid = int(_client_id())
        jobs = (
            JobRequest.query.filter_by(client_id=cid)
            .order_by(JobRequest.created_at.desc())
            .all()
        )
        return jsonify([_serialize_job(j) for j in jobs]), 200

    @app.route("/api/client/<int:client_id>/jobs", methods=["GET"])
    def client_jobs_by_id(client_id):
        sid = _client_id()
        if sid and int(sid) != client_id:
            return jsonify({"error": "Forbidden"}), 403
        if not sid:
            hdr = request.headers.get("X-Client-Id")
            if not hdr or int(hdr) != client_id:
                return jsonify({"error": "Client authentication required"}), 401
        jobs = (
            JobRequest.query.filter_by(client_id=client_id)
            .order_by(JobRequest.created_at.desc())
            .all()
        )
        return jsonify([_serialize_job(j) for j in jobs]), 200

    @app.route("/api/client/jobs", methods=["POST"])
    @login_required_client
    def client_create_job():
        data = _json()
        cid = int(_client_id())
        client = db.session.get(Client, cid)
        if not client:
            return jsonify({"error": "Client not found"}), 404

        skill = (data.get("skill_required") or data.get("service_type") or data.get("skill") or "").strip()
        desc = (data.get("job_description") or data.get("description") or "").strip()
        province = (data.get("province") or "").strip() or "Unknown"
        if not skill or not desc:
            return jsonify({"error": "skill_required and job_description are required"}), 400

        address = (
            data.get("address")
            or data.get("client_address")
            or data.get("job_address_text")
            or ""
        )
        lat = data.get("latitude", data.get("lat"))
        lng = data.get("longitude", data.get("lng"))
        try:
            lat = float(lat) if lat is not None else None
            lng = float(lng) if lng is not None else None
        except (TypeError, ValueError):
            return jsonify({"error": "latitude/longitude must be numbers"}), 400

        if lat is None or lng is None or not address:
            home = Address.query.filter_by(
                owner_type="client", owner_id=cid, label="home"
            ).first()
            if home:
                address = address or home.line1 or home.formatted_address or ""
                lat = lat if lat is not None else home.latitude
                lng = lng if lng is not None else home.longitude
                if not province or province == "Unknown":
                    province = home.province or province

        job = JobRequest(
            client_id=cid,
            client_name=client.name,
            client_phone=client.phone,
            client_address=address or None,
            job_address_text=address or None,
            job_description=desc,
            skill_required=skill,
            appointment_time=_parse_dt(data.get("appointment_time")),
            province=province,
            latitude=lat,
            longitude=lng,
            job_latitude=lat,
            job_longitude=lng,
            status="Open",
            stage="new",
        )
        db.session.add(job)
        db.session.commit()

        audit(
            db, AuditLog, "client", cid, "create", "job_request", job.id,
            description=f"Job created: {skill}",
        )
        return jsonify({"message": "Job created", "job": _serialize_job(job)}), 201

    @app.route("/api/jobs", methods=["GET"])
    def list_jobs():
        status = request.args.get("status")
        q = JobRequest.query
        if status:
            q = q.filter_by(status=status)
        else:
            q = q.filter(JobRequest.status.in_(["Open", "Assigned", "Active"]))
        jobs = q.order_by(JobRequest.created_at.desc()).limit(100).all()
        return jsonify([_serialize_job(j) for j in jobs]), 200

    @app.route("/api/jobs/open", methods=["GET"])
    def list_open_jobs():
        jobs = JobRequest.query.filter(
            JobRequest.status.in_(["Open", "Assigned"])
        ).order_by(JobRequest.created_at.desc()).all()
        return jsonify([_serialize_job(j) for j in jobs]), 200

    def _get_job_or_404(job_id):
        nid = _resolve_job_id(job_id)
        if nid is None:
            return None
        return db.session.get(JobRequest, nid)

    @app.route("/api/jobs/<job_id>", methods=["GET"])
    def get_job(job_id):
        job = _get_job_or_404(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        return jsonify(_serialize_job(job)), 200

    @app.route("/api/jobs/<job_id>/tracking", methods=["GET"])
    def job_tracking(job_id):
        job = _get_job_or_404(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404

        sp = db.session.get(ServiceProvider, job.assigned_sp_id) if job.assigned_sp_id else None
        return jsonify({
            "job_id": job.id,
            "job_ref": f"JOB-{job.id}",
            "status": job.status,
            "stage": job.stage,
            "job_location": {
                "latitude": job.latitude,
                "longitude": job.longitude,
                "address": job.client_address or job.job_address_text,
            },
            "provider": None if not sp else {
                "id": sp.id,
                "name": sp.name,
                "phone": sp.phone,
                "latitude": sp.current_latitude,
                "longitude": sp.current_longitude,
                "updated_at": sp.current_location_at.isoformat() if sp.current_location_at else None,
            },
            "milestones": {
                "created_at": job.created_at.isoformat() if job.created_at else None,
                "assigned_at": job.assigned_at.isoformat() if job.assigned_at else None,
                "accepted_at": job.accepted_at.isoformat() if job.accepted_at else None,
                "arrived_at": job.arrived_at.isoformat() if job.arrived_at else None,
                "started_at": job.started_at.isoformat() if job.started_at else None,
                "completed_at": job.completed_at.isoformat() if job.completed_at else None,
            },
        }), 200

    @app.route("/api/jobs/<job_id>/pay", methods=["POST", "OPTIONS"])
    def job_pay(job_id):
        if request.method == "OPTIONS":
            return ("", 204)
        job = _get_job_or_404(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        data = _json()
        amount = data.get("amount")
        if job.stage in ("completed", "approved", "invoiced"):
            job.stage = "invoiced"
        db.session.commit()
        return jsonify({
            "message": "Payment recorded (stub)",
            "job_id": job.id,
            "amount": amount,
            "job": _serialize_job(job),
        }), 200

    @app.route("/api/sp/jobs", methods=["GET"])
    @login_required_sp
    def sp_jobs_list():
        sid = int(_sp_id())
        jobs = (
            JobRequest.query.filter_by(assigned_sp_id=sid)
            .order_by(JobRequest.created_at.desc())
            .all()
        )
        return jsonify([_serialize_job(j) for j in jobs]), 200

    @app.route("/api/jobs/<job_id>/accept", methods=["POST"])
    @login_required_sp
    def job_accept(job_id):
        sid = int(_sp_id())
        job = _get_job_or_404(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        if job.assigned_sp_id and job.assigned_sp_id != sid:
            return jsonify({"error": "Job assigned to another provider"}), 403
        job.assigned_sp_id = sid
        job.status = "Assigned"
        job.stage = "accepted"
        job.accepted_at = datetime.utcnow()
        if not job.assigned_at:
            job.assigned_at = datetime.utcnow()
        db.session.commit()
        return jsonify({"message": "Job accepted", "job": _serialize_job(job)}), 200

    @app.route("/api/jobs/<job_id>/stage", methods=["PATCH", "POST"])
    @login_required_sp
    def job_update_stage(job_id):
        sid = int(_sp_id())
        job = _get_job_or_404(job_id)
        if not job:
            return jsonify({"error": "Job not found"}), 404
        if job.assigned_sp_id != sid:
            return jsonify({"error": "Not your job"}), 403
        data = _json()
        stage = (data.get("stage") or "").strip()
        if not stage:
            return jsonify({"error": "stage is required"}), 400
        job.stage = stage
        now = datetime.utcnow()
        if stage == "arrived":
            job.arrived_at = now
            job.status = "Active"
        elif stage in ("in_progress", "started"):
            job.started_at = job.started_at or now
            job.status = "Active"
        elif stage == "paused":
            job.paused_at = now
            job.pause_reason = data.get("pause_reason")
        elif stage == "resumed":
            job.resumed_at = now
        elif stage == "completed":
            job.completed_at = now
            job.status = "Completed"
            job.completion_notes = data.get("completion_notes")
        db.session.commit()
        return jsonify(_serialize_job(job)), 200

    @app.route("/api/client/job/<int:job_id>/cancel", methods=["POST"])
    @login_required_client
    def client_cancel_job(job_id):
        cid = int(_client_id())
        job = db.session.get(JobRequest, job_id)
        if not job or job.client_id != cid:
            return jsonify({"error": "Job not found"}), 404
        if job.status == "Completed":
            return jsonify({"error": "Cannot cancel a completed job"}), 400
        job.status = "Cancelled"
        job.stage = "cancelled"
        db.session.commit()
        return jsonify({"message": "Job cancelled", "job": _serialize_job(job)}), 200
