using Microsoft.AspNetCore.Http.HttpResults;

namespace Affairs.API;

public static class Response {
	public static Results<Ok<TGet>, NotFound, BadRequest<string>>
		Get<TGet>(TGet? result) => result is null ? TypedResults.NotFound() : TypedResults.Ok(result);

	public static Results<Ok<TGet>, BadRequest<string>>
		Get<TGet>(TGet? result, TGet @default) => TypedResults.Ok(result ?? @default);

	public static Results<Created<TGet>, BadRequest<string>>
		Create<TGet>(TGet result) => TypedResults.Created("", result);

	public static Results<Created<TUpdate>, NotFound, BadRequest<string>>
		Update<TUpdate>(TUpdate? result) => result is null ? TypedResults.NotFound() : TypedResults.Created("", result);

	public static Results<NoContent, NotFound, BadRequest<string>>
		Delete(bool isDeleted = true) => isDeleted ? TypedResults.NoContent() : TypedResults.NotFound();
}