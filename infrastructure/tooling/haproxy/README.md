# HAProxy Template

This config is the repo-owned baseline for M11.8.

Highlights:

- `roundrobin` for the API backend
- active `httpchk` health checks against `/healthz`
- HTTP/2 ALPN on the TLS frontend
- sticky-session table for optional stateful routing
- built-in stats endpoint on `:8404`

Update the certificate path and backend addresses before using it in a real environment.
