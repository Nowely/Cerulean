namespace Cerulean.Service.Affairs.Models.Domain;

public class Page : Base {
	public string? Title { get; set; }
	public Guid UserId { get; set; }
}