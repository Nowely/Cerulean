using Cerulean.Service.Affairs.Models;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using static Microsoft.AspNetCore.Http.TypedResults;

namespace Cerulean.Service.Affairs.API;

public static class AffairApi {
	public static IEndpointRouteBuilder MapAffairApi(this IEndpointRouteBuilder app) {
		// Routes for querying catalog items.
		app.MapGet("/", GetAllItems);
		app.MapGet("/short", GetAllShortItems);
		// Routes for modifying catalog items.
		app.MapPut("/", UpdateItem);
		app.MapPost("/", CreateItem);
		app.MapDelete("/", DeleteItem);

		return app;
	}

	public static async Task<Results<Ok<Affair[]>, BadRequest<string>>> GetAllItems([AsParameters] Services services) {
		var affairs = await services.Context.Affair.ToArrayAsync();
		return Ok(affairs);
	}

	public static async Task<Results<Ok<AffairShort[]>, BadRequest<string>>> GetAllShortItems([AsParameters] Services services) {
		var affairs = await services.Context.Affair.ProjectToDto().ToArrayAsync();
		return Ok(affairs);
	}

	public static async Task<Created> CreateItem(
		[AsParameters] Services services,
		[FromBody] Affair affair
	) {
		services.Context.Affair.Add(affair);
		var result = await services.Context.SaveChangesAsync();
		return Created("");
	}

	public static async Task<Results<Created, NotFound<string>>> UpdateItem(
		[AsParameters] Services services,
		[FromBody] Affair affair
	) {
		services.Context.Affair.Update(affair);
		var result = await services.Context.SaveChangesAsync();
		return Created("");
	}


	public static async Task<Results<NoContent, NotFound>> DeleteItem(
		[AsParameters] Services services,
		[FromBody] Affair affair
	) {
		services.Context.Affair.Remove(affair);
		var result = await services.Context.SaveChangesAsync();
		return NoContent();
	}
}