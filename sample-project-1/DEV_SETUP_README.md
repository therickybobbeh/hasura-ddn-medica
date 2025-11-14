# Developer Environment Setup - DDN Port Configuration

## Overview

This repository is configured to support **two developers** working simultaneously on the same server without port conflicts.

## Port Assignments

**Developer 1 Ports:**
- Engine (GraphQL): 
- Postgres Connector 1: 
- Postgres Connector 2: 
- Postgres Connector Lean: 
- OTEL gRPC: 
- OTEL HTTP: 

**Developer 2 Ports:**
- Engine (GraphQL): 
- Postgres Connector 1: 
- Postgres Connector 2: 
- Postgres Connector Lean: 
- OTEL gRPC: 
- OTEL HTTP: 

## Usage Instructions

### Developer 1 (in dev1 container)



### Developer 2 (in dev2 container)



## Switching Contexts (if needed)

If you need to change contexts:



## Important Notes

1. **Always use the correct .env file** for your developer number
2. **Both developers can run simultaneously** without port conflicts
3. **Each developer has isolated Docker containers** on different ports
4. **Home directories are persistent** - your work is saved across sessions

## Verifying Your Setup

Docker Compose version v2.39.1

## Troubleshooting

**Port already in use error:**
- Make sure the other developer isn't already running on your ports
- Check: CONTAINER ID   IMAGE                         COMMAND                  CREATED       STATUS       PORTS                                         NAMES
fdf8574cd7c4   codercom/code-server:latest   "/usr/bin/entrypoint…"   3 hours ago   Up 2 hours   0.0.0.0:8082->8080/tcp, [::]:8082->8080/tcp   code-server-dev2
c19783edca88   codercom/code-server:latest   "/usr/bin/entrypoint…"   3 hours ago   Up 2 hours   0.0.0.0:8081->8080/tcp, [::]:8081->8080/tcp   code-server-dev1 to see running containers
- Stop your containers: 

**Can't connect to services:**
- Verify correct port number for your developer
  number
- Check containers are running: CONTAINER ID   IMAGE                         COMMAND                  CREATED       STATUS       PORTS                                         NAMES
fdf8574cd7c4   codercom/code-server:latest   "/usr/bin/entrypoint…"   3 hours ago   Up 2 hours   0.0.0.0:8082->8080/tcp, [::]:8082->8080/tcp   code-server-dev2
c19783edca88   codercom/code-server:latest   "/usr/bin/entrypoint…"   3 hours ago   Up 2 hours   0.0.0.0:8081->8080/tcp, [::]:8081->8080/tcp   code-server-dev1
- Check logs: 

**Context issues:**
- Make sure  has the correct  set
- Verify the correct  file is being used

## Additional Resources

- hasura-ddn-poc repository structure
- Hasura DDN Documentation: https://hasura.io/docs/3.0/
- Docker Compose Documentation: https://docs.docker.com/compose/
