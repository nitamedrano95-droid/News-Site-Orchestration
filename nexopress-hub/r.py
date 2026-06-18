import json, subprocess, time
HUB = 'https://nexopress-hub.sebastianvernis.workers.dev'
r = subprocess.run(['curl','-sS','-X','POST','-H','Content-Type: application/json',
    '-d', json.dumps({'email':'sebastianvernis@gmail.com','password':'smoke'}),
    HUB + '/api/auth/login'], capture_output=True, text=True)
tok = json.loads(r.stdout)['token']
print('token ok')
AH = 'X-Auth: ' + tok
print('AH=' + AH[:15])
url = HUB + '/api/cms/nuevos4/stats?cb=' + str(int(time.time()))
r = subprocess.run(['curl','-sS','-H',AH,'-H','Cache-Control: no-cache',
    '-w','HTTP %{http_code}', url], capture_output=True, text=True)
print('GET stats:', r.stdout[:1200])
