﻿using System.Collections.Generic;

namespace Cerulean.Models;

public enum Status {
	Absent = 0,
	Scheduled = 1,
	Completed = 2,
	Failed = 3
}

public enum Type {
	Daily = 0,
	Week = 1,
	Month = 2,
	Year = 3
}

public class Affair : Base {
	public string Title { get; set; }
	public string Note { get; set; }
	public bool Active { get; set; }
	public Status Status { get; set; }

	public Type Type { get; set; }

	//public List<> Checklist { get; set; } TODO
	//public Difficulty? Difficulty { get; set; } TODO
	//public string Color TODO
	public DateTimeOffset? DueDate { get; set; }
	public List<string> Tags { get; set; } = new();
}