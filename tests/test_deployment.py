from __future__ import annotations

import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class ProductionDeploymentTests(unittest.TestCase):
    def test_compose_exposes_only_nginx_and_includes_certificate_renewal(self) -> None:
        compose = (ROOT / "compose.yaml").read_text()

        self.assertIn("  nginx:\n", compose)
        self.assertIn("  certbot:\n", compose)
        self.assertIn('- "80:80"', compose)
        self.assertIn('- "443:443"', compose)
        self.assertIn('      - "8000"', compose)
        self.assertNotIn('"8000:8000"', compose)
        self.assertIn("./deploy/nginx/runtime:/etc/nginx/conf.d:ro", compose)
        self.assertIn("certbot-certs:/etc/letsencrypt", compose)
        self.assertIn("certbot-webroot:/var/www/certbot", compose)

    def test_nginx_terminates_tls_and_proxies_only_the_configured_domain(self) -> None:
        config = (ROOT / "deploy/nginx/https.conf").read_text()
        bootstrap = (ROOT / "deploy/nginx/bootstrap.conf").read_text()

        self.assertIn("server_name flashcards.eureu.space;", config)
        self.assertIn("return 301 https://flashcards.eureu.space$request_uri;", config)
        self.assertIn("listen 80 default_server;\n    listen [::]:80 default_server;\n    server_name _;", config)
        self.assertIn("listen 80 default_server;\n    listen [::]:80 default_server;\n    server_name _;", bootstrap)
        self.assertIn("ssl_certificate /etc/letsencrypt/live/flashcards.eureu.space/fullchain.pem;", config)
        self.assertIn("proxy_pass http://app:8000;", config)
        self.assertIn("location ^~ /.well-known/acme-challenge/", config)
        self.assertIn("client_max_body_size 32m;", config)
        self.assertIn("Strict-Transport-Security", config)
        self.assertNotIn("X-Frame-Options", config)
        self.assertIn("proxy_set_header X-Forwarded-Proto https;", config)

    def test_deploy_script_has_valid_shell_syntax(self) -> None:
        script = ROOT / "scripts/deploy.sh"

        result = subprocess.run(
            ["bash", "-n", str(script)],
            check=False,
            capture_output=True,
            text=True,
        )

        self.assertEqual(result.returncode, 0, result.stderr)


if __name__ == "__main__":
    unittest.main()
