using System.Text.Json.Serialization;
using Cerulean.Shared;

namespace Affairs.Models.Affair;

public class Affair : IModifiable, ICreatable {
	public Guid Id { get; set; }
	public DateTime CreatedAt { get; set; }
	public DateTime ModifiedAt { get; set; }

	public string Title { get; set; } = string.Empty;
	public string Note { get; set; } = string.Empty;
	public bool Active { get; set; }
	public Status Status { get; set; }

	public AffairType Type { get; set; }


	//public List<> Checklist { get; set; } TODO

	//public Difficulty? Difficulty { get; set; } TODO

	//public string Color TODO
	public DateTimeOffset? DueDate { get; set; }
	public List<string> Tags { get; set; } = new();
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum Status {
	Absent = 0,
	Scheduled = 1,
	Completed = 2,
	Failed = 3
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum AffairType {
	Daily = 0,
	Week = 1,
	Month = 2,
	Year = 3
}