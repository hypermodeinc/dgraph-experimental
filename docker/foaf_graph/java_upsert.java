import io.dgraph.DgraphClient;
import io.dgraph.DgraphGrpc;
import io.dgraph.Transaction;
import io.dgraph.DgraphProto.Request;
import io.dgraph.DgraphProto.Mutation;
import io.dgraph.DgraphProto.Response;
import io.grpc.ManagedChannel;
import io.grpc.ManagedChannelBuilder;

public class DgraphBatchUpsertArrayExample {

    public static void main(String[] args) {
        // 1. Create a connection to Dgraph (gRPC channel)
        ManagedChannel channel = ManagedChannelBuilder
                .forAddress("localhost", 9080)
                .usePlaintext() // remove if using TLS
                .build();

        DgraphGrpc.DgraphStub stub = DgraphGrpc.newStub(channel);
        DgraphClient dgraphClient = new DgraphClient(stub);

        // 2. Create a new transaction
        Transaction txn = dgraphClient.newTransaction();

        try {
            // Array of [email, name] for each user
            String[][] users = {
                {"alice@example.com", "Alice"},
                {"bob@example.com",   "Bob"},
                {"charlie@example.com", "Charlie"}
            };

            int counter = 0;
            for (String[] user : users) {
                String email = user[0];
                String name  = user[1];

                // Query to find if a user with this email already exists
                String query =
                    "query {\n" +
                    "  existingUser" + counter + " as var(func: eq(User.email, \"" + email + "\"))\n" +
                    "}";

                // Conditionally set data only if no existing user is found
                Mutation mu = Mutation.newBuilder()
                        .setCond("@if(eq(len(existingUser" + counter + "), 0))") 
                        .setSetNquads(
                            // Use a blank node (e.g., _:user0) so Dgraph creates a new UID
                            "_:user" + counter + " <User.email> \"" + email + "\" .\n" +
                            "_:user" + counter + " <User.name> \"" + name + "\" .\n"
                        )
                        .build();

                Request req = Request.newBuilder()
                        .setQuery(query)
                        .addMutations(mu)
                        .build();

                // Execute the upsert block for this user
                Response res = txn.doRequest(req);
                System.out.println("Upsert for " + email + ": " + res.getJson().toStringUtf8());

                counter++;
            }

            // 3. Commit the transaction after all upserts
            txn.commit();
            System.out.println("All users upserted successfully.");

        } catch (Exception e) {
            // Discard in case of errors to rollback any partial changes
            txn.discard();
            e.printStackTrace();
        } finally {
            // Clean up channel
            channel.shutdown();
        }
    }
}
