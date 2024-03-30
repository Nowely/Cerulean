var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("Postgres").WithPgAdmin();
var affairDb = postgres.AddDatabase("AffairDb");

var affairs = builder
			  .AddProject<Projects.Affairs>("Affairs")
			  .WithReference(affairDb);

var clientWeb = builder
			  .AddProject<Projects.ClientWeb>("ClientWeb");

//TODO to ClientWeb
/*builder
	.AddNpmApp("Client", "../../Client", "dev")
	.WithReference(affairs)
	.WithEndpoint(3000, scheme: "https", env: "PORT");*/

builder.Build().Run();