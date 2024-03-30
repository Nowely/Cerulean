namespace Affairs.Models.Affair.Dto;

public class AffairGet {
	public Guid Id { get; set; }
	public DateTime CreatedAt { get; set; }
	public DateTime ModifiedAt { get; set; }

	public string Title { get; set; } = string.Empty;
	public string Note { get; set; } = string.Empty;
	public bool Active { get; set; }

	public string SuperTitle { get; set; } = string.Empty;
}