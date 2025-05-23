FROM dgraph/standalone:v24.1.2 AS dgraph
FROM jupyter/minimal-notebook:latest

LABEL org.opencontainers.image.source=https://github.com/hypermodeinc/dgraph-experimental

RUN pip install python-graphql-client
RUN pip install pydgraph

USER root

# Copy Dgraph binary and related files from Dgraph image
COPY --from=dgraph /usr/local/bin/dgraph /usr/local/bin/

# Create data directories for Dgraph
RUN mkdir -p /data
RUN mkdir -p /data/alpha1
RUN mkdir -p /data/alpha2
RUN mkdir -p /data/alpha3
RUN mkdir -p /data/zero1
RUN mkdir -p /data/export

COPY schema.graphql /data/export
COPY dgraph_data.json /data/export
COPY create_friendships.py /data/export

RUN chown -R ${NB_USER}:${NB_GID} /data

# Create startup script with root
COPY startup.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/startup.sh

# Switch back to notebook user
USER ${NB_USER}

COPY plugin.json /home/jovyan/.jupyter/lab/user-settings/@jupyterlab/docmanager-extension/plugin.json

COPY readme.ipynb /home/jovyan/work/readme.ipynb
COPY schema.graphql /home/jovyan/work/schema.graphql
COPY graphql_queries.ipynb /home/jovyan/work/graphql_queries.ipynb
COPY dql_queries.ipynb /home/jovyan/work/dql_queries.ipynb

USER root
RUN chown -R ${NB_USER}:${NB_GID} /home/jovyan

USER ${NB_USER}

# Set working directory
#WORKDIR /workspace
WORKDIR /home/jovyan/work

# Expose Jupyter Lab port
EXPOSE 8888
# Expose Dgraph ports
EXPOSE 8080
EXPOSE 9080
EXPOSE 5080
EXPOSE 6080

# Set entrypoint to our startup script
ENTRYPOINT ["/usr/local/bin/startup.sh"]