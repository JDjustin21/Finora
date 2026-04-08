import bcrypt
from api import db, tabla_clases, app   # importa desde tu api.py

with app.app_context():
    usuario_cls = tabla_clases['usuarios']
    usuarios = db.session.query(usuario_cls).all()

    for u in usuarios:
        if u.password_hash and not u.password_hash.startswith("$2b$"):
            print(f"Rehasheando usuario: {u.correo}")

            hashed = bcrypt.hashpw(
                u.password_hash.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')

            u.password_hash = hashed

    db.session.commit()
    print("✅ Contraseñas actualizadas correctamente")