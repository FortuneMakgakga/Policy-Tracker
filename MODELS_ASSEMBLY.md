# Models assembly

The full schema was pushed in three parts (GitHub tool size limits):

```bash
cat models_part1.py models_part2.py models_part3.py > models.py
```

Or copy the complete `models.py` and `api_routes.py` from the project artifacts folder (they are the authoritative full files).

## After assembling

1. Delete or rename `claims.db`
2. In `app.py`, after `db = SQLAlchemy(app)`, either paste the models or:
   ```python
   # Ensure models use the same db instance
   import models
   models.db = db
   from models import *
   ```
3. Register routes:
   ```python
   from api_routes import register_api_routes
   register_api_routes(app, db, models)
   ```
4. On first run:
   ```python
   with app.app_context():
       db.create_all()
       seed_banks(db.session)
       seed_skills(db.session)
   ```

## API routes file

`api_routes.py` is large. Prefer the complete version from artifacts.
If only partial versions exist on the branch, use the artifacts copy.
