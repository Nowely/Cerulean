using System.Collections;
using System.Text.Json.Serialization;
using Afilter.Internals;

namespace Afilter.Operators;

[JsonConverter(typeof(JsonStringOrNumberEnumConverter<ArrayOperatorType>))]
public enum ArrayOperatorType {
	Equal,
	NotEqual,
	//Intersect
	//NotIntersect
	//Contains
	//NotContains
	//Include
	//NotInclude
	IsEmpty,
	IsNotEmpty
}

//TODO
public record ArrayOperator<T>(ArrayOperatorType Type, T? Value)
	where T : IEnumerable { }