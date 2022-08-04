export const skeleton = `import { Test, TestingModule } from "@nestjs/testing";
[imports]

describe("[filename]", () => {
	let testingModule: TestingModule;
	[lets]

	beforeEach(async function () {
		testingModule = await Test.createTestingModule({
			controllers: [],
			imports: [],
			providers: [
			],
		})
		.compile();

		[instances]
	});

	after(async function () {
		testingModule.close();
	});

	[content]
});`;