using Affairs.Models.Affair;
using Affairs.Models.Domain;

namespace Affairs.Infrastructure;

public static class DbInitializer {
	public static void Initialize(AffairContext context) {
		context.Database.EnsureDeleted();
		context.Database.EnsureCreated();

		if (context.Affair.Any()) return; // DB has been seeded

		var affairs = new Affair[] {
			new() {
				Title = "Выжить",
				Note = "",
				Active = false,
				Status = Status.Failed,
				Type = AffairType.Year
			},
			new() {
				Title = "Перейти рубикон",
				Note = "Пройти «точку невозврата»",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Year
			},
			new() {
				Title = "Buy a new board game",
				Note = "Eldritch Horror",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Week
			},
			new() {
				Title = "Прочитать одну книгу",
				Note = "",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Week
			},
			new() {
				Title = "Прослушать одну книгу",
				Note = "",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Week
			},
			new() {
				Title = "Улучшить дизайн",
				Note = "",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Month
			},
			new() {
				Title = "Улушчить код",
				Note = "",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Month
			},
			new() {
				Title = "Улучшить структуру",
				Note = "",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Month
			},
			new() {
				Title = "Подумать над добавлением новой функциональности",
				Note = "",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Month
			},
			new() {
				Title = "Обновить Readme",
				Note = "",
				Active = true,
				Status = Status.Absent,
				Type = AffairType.Daily
			}
		};

		foreach (var affair in affairs) context.Affair.Add(affair);

		context.User.Add(new User {
			Pages = new List<Page>(new[] {
				new Page { Title = "Home" },
				new Page { Title = "Tasks" }
			})
		});

		/*context.Page.Add(new Page() {
			Title = "Home"
		});*/

		context.SaveChanges();
	}
}