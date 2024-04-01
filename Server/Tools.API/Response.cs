using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Tools.API;

public static class Response {
	public static Results<Ok<TGet>, NotFound, BadRequest<string>>
		Get<TGet>(TGet? value) => value is null ? TypedResults.NotFound() : TypedResults.Ok(value);

	public static Results<Ok<TGet>, BadRequest<string>>
		Get<TGet>(TGet? value, TGet @default) => TypedResults.Ok(value ?? @default);

	public static Results<Created<TGet>, BadRequest<string>>
		Create<TGet>(TGet value) => TypedResults.Created("", value);

	public static Results<Created<TUpdate>, NotFound, BadRequest<string>>
		Update<TUpdate>(TUpdate? value) => value is null ? TypedResults.NotFound() : TypedResults.Created("", value);

	public static Results<NoContent, NotFound, BadRequest<string>>
		Delete(bool isDeleted = true) => isDeleted ? TypedResults.NoContent() : TypedResults.NotFound();
}