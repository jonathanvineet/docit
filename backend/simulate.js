import mqtt from "mqtt";

const config = {
    host: "bdc5f429a9c74af9909c380a0cc79e53.s1.eu.hivemq.cloud",
    port: 8883,
    protocol: "mqtts",
    username: "hivemq.webclient.1743499792537",
    password: "WTf8Ov9wn;.$Fg@7x0UC",
};

const client = mqtt.connect(config);

client.on("connect", () => {
    console.log("🚀 Sensor Simulator Started! Sending fake data to cloud...");

    setInterval(() => {
        const mockData = {
            accelerometer: {
                x: (Math.random() * 2 - 1).toFixed(2),
                y: (Math.random() * 2 - 1).toFixed(2),
                z: (9.8 + Math.random()).toFixed(2),
            },
            gyroscope: {
                x: (Math.random() * 10).toFixed(2),
                y: (Math.random() * 10).toFixed(2),
                z: (Math.random() * 10).toFixed(2),
            },
            pulseoximeter: {
                heartRate: Math.floor(Math.random() * (85 - 70) + 70), // 70-85 BPM
                SpO2: Math.floor(Math.random() * (100 - 95) + 95),    // 95-100%
            }
        };

        client.publish("sensors/data", JSON.stringify(mockData));
        console.log("📡 Published:", mockData.pulseoximeter);
    }, 2000); // Send every 2 seconds
});

client.on("error", (err) => console.error("❌ Sim Error:", err));
