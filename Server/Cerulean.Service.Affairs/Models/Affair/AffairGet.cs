namespace Cerulean.Service.Affairs.Models.Affair;

public class AffairGet : Base {
	public string Title { get; set; }
	public string Note { get; set; }
	public bool Active { get; set; }

	public string SuperTitle { get; set; }
}