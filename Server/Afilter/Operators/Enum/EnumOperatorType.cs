using System.Text.Json.Serialization;
using Afilter.Internals;

namespace Afilter.Operators;

//Right is array of enum state / tags
[JsonConverter(typeof(JsonStringOrNumberEnumConverter<EnumOperatorType>))]
public enum EnumOperatorType {
	Is,
	IsNot,
	IsEmpty,
	IsNotEmpty
}