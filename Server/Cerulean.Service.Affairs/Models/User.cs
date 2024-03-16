namespace Cerulean.Service.Affairs.Models.Domain;

public class User {
	public List<Page> Pages { get; set; }
	public Guid Id { get; set; }
	public DateTime CreatedAt { get; set; }
	public DateTime ModifiedAt { get; set; }
}

