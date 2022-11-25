namespace Cerulean.Models;

public class Base {
	public Guid Id { get; set; } = Guid.NewGuid();
	public DateTime CreateOn { get; set; } = DateTime.UtcNow;
	public DateTime ModifiedOn { get; set; } = DateTime.UtcNow;
}