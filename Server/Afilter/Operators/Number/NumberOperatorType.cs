using System.Text.Json.Serialization;
using Afilter.Internals;

namespace Afilter.Operators;

[JsonConverter(typeof(JsonStringOrNumberEnumConverter<NumberOperatorType>))]
public enum NumberOperatorType {
	/// <summary> Alias == </summary>
	Equal,
	/// <summary> Alias != </summary>
	NotEqual,
	/// <summary> Alias &lt; </summary>
	Less,
	/// <summary> Alias &lt;= </summary>
	LessOrEqual,
	/// <summary> Alias > </summary>
	Greater,
	/// <summary> Alias >= </summary>
	GreaterOrEqual,
	IsEmpty,
	IsNotEmpty
}