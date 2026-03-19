import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

const API_BASE =
  "https://opulent-happiness-7xvg5xp75vq3p95r-5000.app.github.dev";

export default function ClientJobRequest() {
  const [formData, setFormData] = useState({
    client_name: "",
    client_phone: "",
    address: "",
    province: "",
    skill_required: "",
    job_description: "",
    appointment_time: "",
    latitude: "",
    longitude: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // 📍 Auto get location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toString(),
          longitude: position.coords.longitude.toString(),
        }));
        toast.success("Location captured");
      },
      () => {
        toast.error("Failed to get location");
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.client_name ||
      !formData.client_phone ||
      !formData.skill_required ||
      !formData.address ||
      !formData.province
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const clientId = localStorage.getItem("clientId");

      const payload = {
        client_id: clientId ? Number(clientId) : undefined,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        job_description: formData.job_description,
        skill_required: formData.skill_required,
        appointment_time: formData.appointment_time || new Date().toISOString(),
        province: formData.province,
        address: formData.address,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
      };

      const res = await fetch(`${API_BASE}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit service request.");
        return;
      }

      toast.success("Service request submitted successfully");
      setSubmitted(true);

      setFormData({
        client_name: "",
        client_phone: "",
        address: "",
        province: "",
        skill_required: "",
        job_description: "",
        appointment_time: "",
        latitude: "",
        longitude: "",
      });
    } catch (err) {
      setError("Could not connect to server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 p-6">
      <Card className="w-full max-w-lg shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-gray-800">
            Submit a Service Request
          </CardTitle>
        </CardHeader>

        <CardContent>
          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded-md">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="client_name" placeholder="Full Name *" value={formData.client_name} onChange={handleChange} />
            <Input name="client_phone" placeholder="Phone *" value={formData.client_phone} onChange={handleChange} />
            <Input name="address" placeholder="Address *" value={formData.address} onChange={handleChange} />
            <Input name="province" placeholder="Province *" value={formData.province} onChange={handleChange} />
            <Input name="skill_required" placeholder="Service Type *" value={formData.skill_required} onChange={handleChange} />

            <Textarea
              name="job_description"
              placeholder="Job Description"
              value={formData.job_description}
              onChange={handleChange}
            />

            <Input
              type="datetime-local"
              name="appointment_time"
              value={formData.appointment_time}
              onChange={handleChange}
            />

            {/* 📍 Location Section */}
            <div className="flex gap-2">
              <Input
                name="latitude"
                placeholder="Latitude"
                value={formData.latitude}
                onChange={handleChange}
              />
              <Input
                name="longitude"
                placeholder="Longitude"
                value={formData.longitude}
                onChange={handleChange}
              />
            </div>

            <Button type="button" variant="outline" onClick={handleGetLocation}>
              Use My Location
            </Button>

            
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
           
          </form>
        </CardContent>
      </Card>

      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Submitted</DialogTitle>
          </DialogHeader>
          <p>Your request has been sent successfully.</p>
          <DialogFooter>
            <Button onClick={() => setSubmitted(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}