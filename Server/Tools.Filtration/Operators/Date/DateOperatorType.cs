namespace Tools.Filtration.Enums;

public enum DateOperatorType {
	Is,
	IsBefore,
	IsAfter,
	IsOnOrBefore,
	IsOnOrAfter,
	IsBetween,
	IsRelativeToToday, //Past, Next value > 0, This (day, week, month, year)
	IsEmpty,
	IsNotEmpty
}