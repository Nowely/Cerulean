using Affairs.Models.Affair;
using Affairs.Models.Affair.Dto;
using Afilter.Extensions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using static Microsoft.AspNetCore.Http.TypedResults;

namespace Affairs.API;

using GetAllResponse = Task<Results<Ok<AffairGet[]>, BadRequest<string>>>;
using CreateResponse = Task<Created<AffairGet>>;
using UpdateResponse = Task<Results<Created<AffairGet>, NotFound>>;
using DeleteResponse = Task<Results<NoContent, NotFound>>;

public static class AffairApi {
	public static IEndpointRouteBuilder MapAffairApi(this IEndpointRouteBuilder app) {
		app.MapGet("/", GetAllItems);
		app.MapPut("/", UpdateItem);
		app.MapPost("/", CreateItem);
		app.MapDelete("/", DeleteItem);

		return app;
	}

	public static async GetAllResponse GetAllItems([AsParameters] GetAllRequest request) {
		var affairs = await request.Context.Affair
								   .ApplyFilter(request.Filter)
								   .ToDto().ToArrayAsync();

		return Ok(affairs);
	}

	public static async CreateResponse CreateItem([AsParameters] CreateRequest request) {
		var entity = request.Affair.ToEntity();

		request.Context.Affair.Add(entity);

		await request.Context.SaveChangesAsync();
		return Created("", entity.ToDto());
	}

	public static async UpdateResponse UpdateItem([AsParameters] UpdateRequest request) {
		var entity = await request.Context.Affair.FindAsync(request.Affair.Id);
		if (entity is null) return NotFound();

		request.Affair.ApplyUpdateTo(entity);
		request.Context.Affair.Update(entity);

		await request.Context.SaveChangesAsync();
		return Created("", entity.ToDto());
	}

	public static async DeleteResponse DeleteItem([AsParameters] DeleteRequest request) {
		var entities = request.Ids.Select(id => new Affair {Id = id});

		request.Context.Affair.RemoveRange(entities);

		await request.Context.SaveChangesAsync();
		return NoContent();
	}
}