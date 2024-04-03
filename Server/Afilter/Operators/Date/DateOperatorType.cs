using System.Text.Json.Serialization;
using Afilter.Internals;

namespace Afilter.Operators;

[JsonConverter(typeof(JsonStringOrNumberEnumConverter<DateOperatorType>))]
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