/*****************************************************************
 * global vars
*****************************************************************/
var session_id = 0;
var host = "";
var floors = 5;
const ctx = document.getElementById("main_canvas").getContext("2d");
const state_label = document.getElementById("state_label");
const weight_label = document.getElementById("weight_label");
const enter_button = document.getElementById("enter_button");
const exit_button = document.getElementById("exit_button");



/*****************************************************************
 * window section
*****************************************************************/

function start_elevator() {
	host = document.getElementById("host_input").value;
	var name = document.getElementById("name_input").value;
	var time = document.getElementById("time_input").value;
	floors = document.getElementById("floors_input").value;

	var requestOptions = {
		method: "POST",
		redirect: "follow",
	};

	fetch(
		`${host}/newSession?clientName=${name}&timeFactor=${time}&floors=${floors}`,
		requestOptions
	)
		.then((response) => response.json())
		.then((result) => {
			console.log(result);
			session_id = result.sessionId;
			console.log(session_id);
			setInterval(next_cycle, 16);
		})
		.catch((error) => console.log("error", error));

	add_buttons();

	init();

}

function add_buttons() {
	for (var i = 1; i <= floors; i++) {
		var button = document.createElement("button");
		var br = document.createElement("br");
		button.innerHTML = i;

		var list = document.getElementById("buttons_list");
		list.appendChild(button);
		list.appendChild(br);

		button.addEventListener ("click", call_for_floor.bind(null, i)
		);
	}
}

function call_for_floor(floor_n) {
	go_to_floor(floor_n)
}

function enter_passenger() {
	var requestOptions = {
	  method: 'POST',
	  redirect: 'follow'
	};

	fetch(`${host}/entryPassengers?sessionId=${session_id}&numberOfPeople=1`, requestOptions)
	  .then(response => response.text())
	  .then(result => console.log(result))
	  .catch(error => console.log('error', error));
}

function exit_passenger() {
	var requestOptions = {
	  method: 'POST',
	  redirect: 'follow'
	};

	fetch(`${host}/exitPassengers?sessionId=${session_id}&numberOfPeople=1`, requestOptions)
	  .then(response => response.text())
	  .then(result => console.log(result))
	  .catch(error => console.log('error', error));
}

function next_cycle() {
	var new_controls = controller_cycle()

	var myHeaders = new Headers();
	myHeaders.append("Content-Type", "application/json");

	var raw = JSON.stringify(new_controls);

	var requestOptions = {
		method: "PUT",
		headers: myHeaders,
		body: raw,
		redirect: "follow",
	};

	fetch(`${host}/nextCycle?sessionId=${session_id}`, requestOptions)
		.then((response) => response.json())
		.then((result) => {

			sensors = result
			position = sensors.emulation.Position;

			console.log(position);
			if (sensors.emulation.Alarm != null) {
				alert(sensors.emulation.Alarm)
			}
		})
		.catch((error) => console.log("error", error));
}





/*****************************************************************
 * drawing section
*****************************************************************/
const elevator = new Image();

function init() {
	elevator.src = "elevator_icon.png";
	window.requestAnimationFrame(draw);
	ctx.canvas.width = 300;
	ctx.canvas.height = 100*floors + 100;
}

function draw() {
	window.requestAnimationFrame(draw);
	ctx.globalCompositeOperation = "destination-over";
	ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

	if( Object.keys(sensors).length === 0 ) {
		return
	}

	elevator.src = "elevator_icon.png";
	if (sensors.emulation.Door == "OPENED") {
		elevator.src = "elevator_icon_opened.png";
	}

	ctx.drawImage(elevator, 100, (ctx.canvas.height - 50) - position * (100/3) - 75, 75, 75);
	ctx.beginPath();
	for(var i = 0; i < floors; i+=1) {
		var y = ctx.canvas.height - 50 - i * 100
		ctx.moveTo(50, y);
		ctx.lineTo(250, y);
		ctx.font = "12px serif";
		ctx.fillText(i + 1 + " ????????", 5, y);
	}
	ctx.stroke();

	state_label.innerHTML = "??????????????????: " + state
	weight_label.innerHTML = "??????: " + sensors.sensors.WeightSensor
	enter_button.disabled = state != states.WAITING
	exit_button.disabled = state != states.WAITING
}



/*****************************************************************
 * controller section
*****************************************************************/
var position = "";
var control_json = {}
var floor_to_go = 0
var sensors = {}
const states = {
	WAITING: "?????? ??????????????",
	SEARCH_FOR_FLOOR: "?????? ????????",
	CLOSE_AND_GO_DOWN: "???????????????? ??????????, ?????????? ?????? ????????",
	CLOSE_AND_GO_UP: "???????????????? ??????????, ?????????? ?????? ??????????",
	GO_DOWN_TO_FLOOR: "?????? ????????",
	GO_UP_TO_FLOOR: "?????? ??????????",
	OPENING_DOORS: "???????????????? ??????????",
}
var state = states.SEARCH_FOR_FLOOR

function go_to_floor(floor_n) {
	if (sensors.sensors.FloorSensor.includes(true) == false) {
		return
	}

	if (sensors.sensors.WeightSensor >= 500) {
		return;
	}	

	floor_to_go = floor_n-1

	var current_floor = sensors.sensors.FloorSensor.indexOf(true)

	if ( current_floor == floor_to_go ) {
		return
	}

	if ( current_floor > floor_to_go ) {
		state = states.CLOSE_AND_GO_DOWN
	}
	else {
		state = states.CLOSE_AND_GO_UP
	}
}

function controller_cycle() {
	control_json = {
		MoveUpFast: false,
		MoveUpSlow: false,
		MoveDownFast: false,
		MoveDownSlow: false,
		DoClose: false,
		DoOpen: false,
		}

	if (Object.keys(sensors).length === 0) { //?? ???????????????? js
		return control_json
	}

	switch(state)
	{
		case states.WAITING:
			break;

		case states.SEARCH_FOR_FLOOR:
			if (sensors.sensors.FloorSensor.includes(true) ) {
				state = states.OPENING_DOORS
				return control_json
			}
				
			if (sensors.sensors.ApproachSensor.includes(true) ) {
				control_json.MoveUpSlow = true
				return control_json
			}
				
			control_json.MoveUpFast = true
			break;

		case states.GO_UP_TO_FLOOR:
			var current_floor = sensors.sensors.FloorSensor.indexOf(true)
			if (current_floor == floor_to_go) {
				state = states.OPENING_DOORS
				break;
			}
			var approaching_floor = sensors.sensors.ApproachSensor.indexOf(true)
			if (approaching_floor == floor_to_go) {
				control_json.MoveUpSlow = true
				break;
			}

			control_json.MoveUpFast = true
			break;

		case states.GO_DOWN_TO_FLOOR:
			var current_floor = sensors.sensors.FloorSensor.indexOf(true)
			if (current_floor == floor_to_go) {
				state = states.OPENING_DOORS
				break;
			}
			var approaching_floor = sensors.sensors.ApproachSensor.indexOf(true)
			if (approaching_floor == floor_to_go) {
				control_json.MoveDownSlow = true
				break;
			}

			control_json.MoveDownFast = true
			break;

		case states.OPENING_DOORS:
			if (sensors.sensors.DoorOpened == true) {
				state = states.WAITING
				break;
			}

			control_json.DoOpen = true
			break

		case states.CLOSE_AND_GO_UP:
			if (sensors.sensors.ObstacleSensor == true) {
				break;
			}

			if (sensors.sensors.DoorClosed == true) {
				state = states.GO_UP_TO_FLOOR
				break;
			}

			control_json.DoClose = true
			break

		case states.CLOSE_AND_GO_DOWN:
			if (sensors.sensors.ObstacleSensor == true) {
				break;
			}

			if (sensors.sensors.DoorClosed == true) {
				state = states.GO_DOWN_TO_FLOOR
				break;
			}

			control_json.DoClose = true
			break
	}

	
	return control_json

}
