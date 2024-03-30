var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("Postgres").WithPgAdmin();
var affairDb = postgres.AddDatabase("AffairDb");

var affairs = builder
			  .AddProject<Projects.Affairs>("Affairs")
			  .WithReference(affairDb);

var clientWeb = builder
			  .AddProject<Projects.ClientWeb>("ClientWeb");

builder
	.AddNpmApp("Client", "../../Client", "dev")
	.WithReference(clientWeb)
	.WithEndpoint(3000, scheme: "https", env: "PORT")
	.ExcludeFromManifest();

builder.Build().Run();