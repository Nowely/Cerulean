namespace Cerulean.Service.Affairs.Models.Domain;

public class Page {
	public string? Title { get; set; }
	public Guid UserId { get; set; }
	public Guid Id { get; set; }
	public DateTime CreatedAt { get; set; }
	public DateTime ModifiedAt { get; set; }
}