# 🚀 Guide de Déploiement — Assistant PPV Production

## Prérequis

- **Node.js 18+** (pour le backend)
- **Apache 2.4+** avec mod_proxy activé
- **Clés API** : Azure OpenAI OU OpenAI (ou Claude)
- **Accès serveur** SNCF Lyon (root/sudo)

---

## 1️⃣ Préparation du serveur

### 1.1 Créer le dossier d'application

```bash
# Sur le serveur (ex: lyon-ppv-01)
sudo mkdir -p /var/www/chatbot-ppv
sudo chown -R www-data:www-data /var/www/chatbot-ppv
sudo chmod 755 /var/www/chatbot-ppv
```

### 1.2 Installer Node.js (si absent)

```bash
# Via NodeSource (Ubuntu/Debian)
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs npm

# Vérifier
node --version  # v18.x.x
npm --version   # 9.x.x
```

### 1.3 Installer les dépendances Apache

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod rewrite
sudo a2enmod headers
sudo a2enmod deflate
sudo a2enmod expires

sudo apache2ctl restart
```

---

## 2️⃣ Déployer le code

### 2.1 Copier les fichiers

```bash
# Depuis ta machine locale (ou git clone)
scp -r chatbot-production/* user@lyon-ppv-server:/var/www/chatbot-ppv/

# OU si tu as un repo Git
cd /var/www/chatbot-ppv
git clone https://your-repo/chatbot-ppv.git .
```

### 2.2 Installer les dépendances Node

```bash
cd /var/www/chatbot-ppv
npm install --production

# Vérifier que ça marche
npm start
# Devrait afficher: 🚀 Assistant PPV server running on port 3001
# Ctrl+C pour arrêter
```

---

## 3️⃣ Configuration des variables d'environnement

### 3.1 Créer le fichier .env

```bash
sudo nano /var/www/chatbot-ppv/.env
```

### 3.2 Remplir selon ton choix LLM

**Option A: Azure OpenAI (pour SNCF)**

```env
PORT=3001
NODE_ENV=production

AZURE_OPENAI_KEY=your-azure-key-from-portal
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT=gpt-4-deployment-name

CORS_ORIGIN=https://ppv-assistant.sncf-interne.fr
```

**Option B: OpenAI Direct**

```env
PORT=3001
NODE_ENV=production

OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4

CORS_ORIGIN=https://ppv-assistant.sncf-interne.fr
```

**Option C: Claude (Anthropic)**

```env
PORT=3001
NODE_ENV=production

OPENAI_API_KEY=sk-ant-...  # Clé Claude via OpenAI-compatible
OPENAI_MODEL=claude-opus

CORS_ORIGIN=https://ppv-assistant.sncf-interne.fr
```

### 3.3 Permissions

```bash
sudo chown www-data:www-data /var/www/chatbot-ppv/.env
sudo chmod 600 /var/www/chatbot-ppv/.env
```

---

## 4️⃣ Configuration Apache

### 4.1 Copier la config

```bash
sudo cp /var/www/chatbot-ppv/apache-config.conf /etc/apache2/sites-available/chatbot-ppv.conf
```

### 4.2 Adapter le fichier pour ton environnement

```bash
sudo nano /etc/apache2/sites-available/chatbot-ppv.conf
```

Remplacer:
- `ppv-assistant.local` → `ppv-assistant.sncf-interne.fr` (ou ton domaine)
- `localhost:3001` → adapter si backend sur autre machine
- DocumentRoot si autre chemin

### 4.3 Activer le site

```bash
sudo a2ensite chatbot-ppv
sudo a2dissite 000-default  # Désactiver le site par défaut (optionnel)
sudo apache2ctl configtest
# Doit afficher: Syntax OK

sudo systemctl restart apache2
```

### 4.4 Vérifier

```bash
sudo apache2ctl status | grep chatbot-ppv
curl http://localhost/  # Doit retourner le HTML
```

---

## 5️⃣ Lancer le backend

### 5.1 Avec PM2 (recommended)

```bash
sudo npm install -g pm2

cd /var/www/chatbot-ppv
sudo pm2 start server.js --name "chatbot-ppv"
sudo pm2 save
sudo pm2 startup

# Vérifier
sudo pm2 status
```

### 5.2 Alternative: systemd service

Créer `/etc/systemd/system/chatbot-ppv.service`:

```ini
[Unit]
Description=Assistant PPV - Node.js Chatbot
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/chatbot-ppv
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment="NODE_ENV=production"
EnvironmentFile=/var/www/chatbot-ppv/.env

[Install]
WantedBy=multi-user.target
```

Puis:

```bash
sudo systemctl daemon-reload
sudo systemctl start chatbot-ppv
sudo systemctl enable chatbot-ppv
sudo systemctl status chatbot-ppv
```

---

## 6️⃣ Tests

### 6.1 Santé du backend

```bash
curl http://localhost:3001/api/health
# Résultat:
# {"status":"ok","llm":"Azure OpenAI","timestamp":"2026-09-07T..."}
```

### 6.2 Test du chat API

```bash
curl -X POST http://localhost:3001/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Ma VM est lente, que faire ?"}
    ]
  }'
```

### 6.3 Accès Web

```bash
# Depuis ta machine locale
curl http://ppv-assistant.sncf-interne.fr/
# Ou ouvre dans le navigateur
```

---

## 7️⃣ Logs et monitoring

### 7.1 Logs Apache

```bash
sudo tail -f /var/log/apache2/ppv-chatbot-access.log
sudo tail -f /var/log/apache2/ppv-chatbot-error.log
```

### 7.2 Logs Node.js (si PM2)

```bash
sudo pm2 logs chatbot-ppv
```

### 7.3 Logs systemd (si service)

```bash
sudo journalctl -u chatbot-ppv -f
```

---

## 8️⃣ Mise en production HTTPS

### 8.1 Obtenir un certificat (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-apache
sudo certbot certonly --apache -d ppv-assistant.sncf-interne.fr
```

### 8.2 Adapter la config Apache

Remplacer la section `<VirtualHost *:443>` dans `/etc/apache2/sites-available/chatbot-ppv.conf`:

```apache
<VirtualHost *:443>
    ServerName ppv-assistant.sncf-interne.fr
    DocumentRoot /var/www/chatbot-ppv/public
    
    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/ppv-assistant.sncf-interne.fr/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/ppv-assistant.sncf-interne.fr/privkey.pem
    
    # ... reste de la config ...
</VirtualHost>

# Redirection HTTP → HTTPS
<VirtualHost *:80>
    ServerName ppv-assistant.sncf-interne.fr
    Redirect permanent / https://ppv-assistant.sncf-interne.fr/
</VirtualHost>
```

### 8.3 Recharger Apache

```bash
sudo apache2ctl restart
```

---

## 9️⃣ Dépannage

### Erreur 502 Bad Gateway

```bash
# Vérifier que Node est lancé
sudo pm2 status
# ou
sudo systemctl status chatbot-ppv

# Vérifier le port 3001
netstat -tulpn | grep 3001
```

### Erreur 404 sur /api

```bash
# Vérifier les modules proxy
apache2ctl -M | grep proxy
# Doit afficher proxy_module et proxy_http_module
```

### CORS Error

Vérifier dans `apache-config.conf`:
```apache
Header set Access-Control-Allow-Origin "https://ppv-assistant.sncf-interne.fr"
```

### LLM API Timeout

Augmenter le timeout dans `server.js`:
```javascript
{ maxTokens: 1000, timeout: 60000 }
```

---

## 🔟 Mises à jour

### Pull la dernière version

```bash
cd /var/www/chatbot-ppv
git pull origin main
npm install
sudo systemctl restart chatbot-ppv
```

### Redéployer

```bash
sudo systemctl restart chatbot-ppv
sudo systemctl restart apache2
```

---

## 📊 Monitoring avancé

### Graphana + Prometheus (optionnel)

Ajouter la métrique personnalisée dans `server.js`:

```javascript
let requestCount = 0;
app.use((req, res, next) => {
  requestCount++;
  next();
});

app.get('/api/metrics', (req, res) => {
  res.json({ requests: requestCount, uptime: process.uptime() });
});
```

---

## Contacts support

- **Slack**: #ppv-assistant-dev
- **Email**: margot.xxx@sncf.fr
- **Repo**: your-git-repo

---

**Déploiement ok? 🎉** Partage le lien avec l'équipe PPV!
