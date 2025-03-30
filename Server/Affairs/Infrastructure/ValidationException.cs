namespace Affairs.Infrastructure;

public class ValidationException(string? message, Dictionary<string,string[]> errors) : Exception(message) {
	public Dictionary<string, string[]> Errors { get; set; } = errors;
}

public class NotFoundException(string? message) : Exception(message);