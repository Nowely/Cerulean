using System.Collections.Generic;

namespace Cerulean.Models; 

public class User: Base {
	public List<Page> Pages { get; set; }
}