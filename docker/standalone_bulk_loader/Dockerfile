# trunk-ignore-all(checkov/CKV_DOCKER_2)
# trunk-ignore-all(checkov/CKV_DOCKER_3)
ARG DGRAPH_VERSION=latest
FROM dgraph/dgraph:${DGRAPH_VERSION}
LABEL MAINTAINER="Hypermode <hello@hypermode.com>"


# Zero port
EXPOSE 5080
# REST API port
EXPOSE 8080
# gRPC API port
EXPOSE 9080


COPY load_and_run.sh /load_and_run.sh
RUN chmod +x /load_and_run.sh
CMD ["/load_and_run.sh"]
