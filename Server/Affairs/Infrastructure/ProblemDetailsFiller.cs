using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Affairs.Infrastructure;

public class ProblemDetailsFiller(
	ILogger<ProblemDetailsFiller> logger,
	IProblemDetailsService problemDetailsService
) : IExceptionHandler {
	public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken token) {
		var problemDetails = GetProblemDetails(exception);
		await WriteProblemDetailsAsync(httpContext, problemDetails);

		// Return false to continue with the default behavior or true to signal that this exception is handled
		return true;
	}

	private static ProblemDetails GetProblemDetails(Exception exception) => exception switch {
		ValidationException validationException => new ValidationProblemDetails {
			Status = StatusCodes.Status400BadRequest,
			Errors = validationException.Errors,
			Detail = validationException.Message,
		},
		OperationCanceledException => new ProblemDetails {
			Status = StatusCodes.Status499ClientClosedRequest,
			Detail = exception.Message,
		},
		NotImplementedException => new ProblemDetails {
			Status = StatusCodes.Status501NotImplemented,
			Detail = exception.Message,
		},
		NotFoundException => new ProblemDetails {
			Status = StatusCodes.Status404NotFound,
			Detail = exception.Message,
		},
		_ => new ProblemDetails {
			Status = StatusCodes.Status500InternalServerError,
			Detail = exception.Message,
		},
	};

	private async Task WriteProblemDetailsAsync(HttpContext httpContext, ProblemDetails problemDetails) {
		httpContext.Response.StatusCode = problemDetails.Status ?? StatusCodes.Status500InternalServerError;
		await problemDetailsService.WriteAsync(new ProblemDetailsContext {
			HttpContext = httpContext,
			ProblemDetails = problemDetails
		});
	}
}