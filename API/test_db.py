import psycopg

conn = psycopg.connect(
    host="127.0.0.1",
    port="5433",
    dbname="FinoraDB",
    user="postgres",
    password="postgre",
    client_encoding="UTF8"
)

print("Conexión exitosa")
conn.close()