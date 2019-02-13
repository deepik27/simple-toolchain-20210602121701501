const fs = require("fs-extra");
const asset = require("cvi-node-lib").asset;
const debug = require('debug')('configure:maximo');
debug.log = console.log.bind(console);

const configure = async () => {

	const fleetVehicleClassification = asset._createVehicleClassificationObject(
		"marudai FLEET VEHICLE",
		[
			{ "id": "DEST_LAT", "datatype": "NUMERIC" },
			{ "id": "DEST_LON", "datatype": "NUMERIC" },
			{ "id": "FUELTANK", "datatype": "NUMERIC" },
			{ "id": "MILEAGE", "datatype": "NUMERIC" },
			{ "id": "THUMBNAILURL", "datatype": "ALN" },
			{ "id": "YEAR", "datatype": "NUMERIC" },
			{ "id": "TCU_ID", "datatype": "ALN" }
		],
		"Vehicle Classification for the Fleet Management Starter App");
	debug(JSON.stringify(fleetVehicleClassification));

	console.log()
	console.log(`Base URL: ${asset.assetConfig.maximo.baseURL}`);

	const username = await readLine("Enter maximo admin username: ");
	const password = await readLine("Enter maximo admin password: ", true);
	asset.assetConfig.maximo.username = username;
	asset.assetConfig.maximo.password = password;
	debug(JSON.stringify(asset.assetConfig));
	const classification = await asset.addClassification(fleetVehicleClassification).catch(error => {
		console.error(error);
	});
	console.log(`Classification ${classification.classificationid} is created`);
};
const readLine = (message, isPassword) => {
	process.stdin.resume();
	process.stdin.setEncoding("utf8");
	process.stdin.setRawMode(true);

	let password = "";
	return new Promise((resolve, reject) => {
		process.stdout.write(message);
		const ondata = ch => {
			ch = ch + "";
			if (ch.charCodeAt(0) === 8) {
				password = password.slice(0, -1);
			} else {
				switch (ch) {
					case "\n":
					case "\r":
						close();
						return resolve(password);
					case "\u0003":
					case "\u0004":
						close();
						return reject();
					default:
						password += ch;
						process.stdout.write(isPassword ? "*" : ch);
						break;
				}
			}
		};
		process.stdin.on("data", ondata);

		const onend = () => {
			close();
			return resolve(password);
		};
		process.stdin.on("end", onend);

		const close = () => {
			process.stdout.write("\n");
			process.stdin.pause();
			process.stdin.setRawMode(false);
			process.stdin.removeListener("data", ondata);
			process.stdin.removeListener("end", onend);
		}
	});
}

configure().catch(error => {
	console.error(error);
	console.error("\nConfiguration is abandoned.");
});