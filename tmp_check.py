import json, urllib.request
req = urllib.request.Request('http://localhost:4000/api/interview/start', data=json.dumps({'role':'General','questionCount':3}).encode(), headers={'Content-Type':'application/json','Authorization':'Bearer test-token'}, method='POST')
try:
    with urllib.request.urlopen(req, timeout=10) as res:
        print(res.status)
        print(res.read().decode())
except Exception as e:
    print(type(e).__name__, e)
