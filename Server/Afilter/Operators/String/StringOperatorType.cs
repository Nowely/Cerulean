using System.Text.Json.Serialization;
using Afilter.Internals;

namespace Afilter.Operators;

[JsonConverter(typeof(JsonStringOrNumberEnumConverter<StringOperatorType>))]
public enum StringOperatorType {
	Is,
	IsNot,
	Contains,
	NotContains,
	StartsWith,
	NotStartsWith,
	EndsWith,
	NotEndsWith,
	IsMatch,
	IsNotMatch,

	/// <summary> Apply IsNullOrWhiteSpace </summary>
	IsEmpty,

	/// <summary> Apply not IsNullOrWhiteSpace </summary>
	IsNotEmpty,
}