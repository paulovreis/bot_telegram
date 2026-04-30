#!/usr/bin/env python3
"""
Script de configuração inicial.
Gera chaves seguras e cria o arquivo .env pronto para uso.
"""
import secrets
import getpass
import os
import sys

def main():
    print("=" * 60)
    print("  Configuração inicial do Bot Telegram Scheduler")
    print("=" * 60)

    try:
        from cryptography.fernet import Fernet
        import bcrypt
    except ImportError:
        print("\nInstalando dependências do script...")
        os.system(f"{sys.executable} -m pip install cryptography bcrypt")
        from cryptography.fernet import Fernet
        import bcrypt

    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    env_path = os.path.abspath(env_path)

    # Lê .env existente para preservar os valores do Telegram
    existing = {}
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    existing[k.strip()] = v.strip()

    # Gera chaves seguras
    secret_key = secrets.token_hex(64)
    refresh_secret_key = secrets.token_hex(64)
    encryption_key = Fernet.generate_key().decode()

    # Senha do admin
    print("\nDefina a senha do painel de controle:")
    while True:
        password = getpass.getpass("  Senha: ")
        confirm  = getpass.getpass("  Confirme: ")
        if password == confirm and len(password) >= 8:
            break
        print("  Senhas não conferem ou muito curta (mín. 8 chars). Tente novamente.")

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()

    # Preserva valores existentes do Telegram
    bot_token = existing.get("TELEGRAM_BOT_TOKEN", "8650256155:AAG1Qj_vE1vC6DAsRB-gYLMPqtUF_yj-jA")
    chat_id   = existing.get("TELEGRAM_CHAT_ID", "")
    pg_pass   = existing.get("POSTGRES_PASSWORD", "B0tSecure#2026")

    env_content = f"""# Auto-gerado por scripts/setup.py

# =============================================================
# PostgreSQL
# =============================================================
POSTGRES_DB=telegram_bot
POSTGRES_USER=botuser
POSTGRES_PASSWORD={pg_pass}
DATABASE_URL=postgresql+asyncpg://botuser:{pg_pass}@db:5432/telegram_bot

# =============================================================
# JWT
# =============================================================
SECRET_KEY={secret_key}
REFRESH_SECRET_KEY={refresh_secret_key}

# =============================================================
# Criptografia Fernet
# =============================================================
ENCRYPTION_KEY={encryption_key}

# =============================================================
# Login fixo do painel
# =============================================================
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH={password_hash}

# =============================================================
# Telegram Bot
# =============================================================
TELEGRAM_BOT_TOKEN={bot_token}
TELEGRAM_CHAT_ID={chat_id}

# =============================================================
# Fuso horário
# =============================================================
TZ=America/Sao_Paulo
"""

    with open(env_path, "w") as f:
        f.write(env_content)

    print(f"\n✓ Arquivo .env gerado em: {env_path}")
    print("\nPróximos passos:")
    print("  1. make ssl     → gera o certificado HTTPS")
    print("  2. make build   → constrói as imagens Docker")
    print("  3. make up      → sobe o sistema")
    print("  4. Acesse: https://localhost:9781")
    print(f"\n  Login: admin / [senha definida acima]")

if __name__ == "__main__":
    main()
