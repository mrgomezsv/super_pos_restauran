import uvicorn
from test_app import app

if __name__ == "__main__":
    print("Iniciando servidor de prueba...")
    uvicorn.run(app, host="127.0.0.1", port=3001, log_level="info")
