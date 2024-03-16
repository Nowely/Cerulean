var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("CeruleanDB").AddDatabase("Postgres");

var gateway = builder.AddProject<Projects.Cerulean_Service_Affairs>("Gateway")
					 .WithReference(postgres);

builder.AddNpmApp("Client", "../../Client", "dev")
	   .WithReference(gateway)
	   .WithEndpoint(3000, scheme: "https", env: "PORT");

builder.Build().Run();