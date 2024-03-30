namespace Affairs.Models.Requests;

public record IdRequest<TDb> {
	public Guid Id { get; init; }
	public required TDb Db { get; set; }
}