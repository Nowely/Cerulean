namespace Afftration.Operators.String;

//Right is string
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