using Affairs.Models.Affair;
using Affairs.Models.Affair.Dto;
using Afilter.Extensions;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using static Microsoft.AspNetCore.Http.TypedResults;

namespace Affairs.API;

using GetResponse = Task<Results<Ok<AffairGet>, BadRequest<string>>>;
using GetAllResponse = Task<Results<Ok<AffairGet[]>, BadRequest<string>>>;
using CreateResponse = Task<Created<AffairGet>>;
using UpdateResponse = Task<Results<Created<AffairGet>, NotFound>>;
using DeleteResponse = Task<Results<NoContent, NotFound>>;

public static class AffairApi {
	public static IEndpointRouteBuilder MapAffairApi(this IEndpointRouteBuilder app) {
		app.MapGet("/{id:guid}", GetById);
		app.MapPost("/filter", GetByFilter);
		app.MapPut("/", Update);
		app.MapPost("/", Create);
		app.MapDelete("/", Delete);

		return app;
	}

	public static async GetResponse GetById([AsParameters] GetByIdRequest request) {
		var affairs = await request.Context.Affair
								   .ToDto()
								   .FirstOrDefaultAsync(affair => affair.Id == request.Id);

		return Ok(affairs);
	}

	public static async GetAllResponse GetByFilter([AsParameters] GetAllPostRequest request) {
		var affairs = await request.Context.Affair
								   .ApplyFilter(request.Filter)
								   .ToDto()
								   .ToArrayAsync();

		return Ok(affairs);
	}

	public static async CreateResponse Create([AsParameters] CreateRequest request) {
		var entity = request.Affair.ToEntity();

		request.Context.Affair.Add(entity);

		await request.Context.SaveChangesAsync();
		return Created("", entity.ToDto());
	}

	public static async UpdateResponse Update([AsParameters] UpdateRequest request) {
		var entity = await request.Context.Affair.FindAsync(request.Affair.Id);
		if (entity is null) return NotFound();

		request.Affair.ApplyUpdateTo(entity);
		request.Context.Affair.Update(entity);

		await request.Context.SaveChangesAsync();
		return Created("", entity.ToDto());
	}

	public static async DeleteResponse Delete([AsParameters] DeleteRequest request) {
		var entities = request.Ids.Select(id => new Affair {Id = id});

		request.Context.Affair.RemoveRange(entities);

		await request.Context.SaveChangesAsync();
		return NoContent();
	}
}