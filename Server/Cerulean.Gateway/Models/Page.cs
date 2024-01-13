namespace Cerulean.Models; 

public class Page: Base {
	public string? Title { get; set; }
	public Guid UserId { get; set; }
}