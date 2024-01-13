using Projects;

var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("CeruleanDB").AddDatabase("Postgres");

var gateway = builder.AddProject<Cerulean_Gateway>("Gateway")
					 .WithReference(postgres);

builder.AddNpmApp("Client", "../../Client", "dev")
	   .WithReference(gateway)
	   .WithServiceBinding(3000, scheme: "https", env: "PORT");

builder.Build().Run();