namespace Affairs.Models.Affair.Dto;

public class AffairGet {
	public Guid Id { get; set; }
	public DateTime CreatedAt { get; set; }
	public DateTime ModifiedAt { get; set; }

	public string Title { get; set; }
	public string Note { get; set; }
	public bool Active { get; set; }

	public string SuperTitle { get; set; }
}