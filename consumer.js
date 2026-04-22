require('dotenv').config();
const amqp = require('amqplib');
const mongoose = require('mongoose');
const Inventory = require('./models/Inventory');

const rabbitmqUrl = process.env.RABBITMQ_URL;
const mongoUri = process.env.MONGO_URI;
const queueName = process.env.QUEUE_NAME || 'product.created';

async function startConsumer() {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected (inventory)');

    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    await channel.assertQueue(queueName, { durable: true });

    console.log('Connected to RabbitMQ');
    console.log(`Waiting for messages in queue: ${queueName}`);

    channel.consume(queueName, async (message) => {
      if (message) {
        const content = message.content.toString();
        console.log('Received message:', content);

        try {
          const product = JSON.parse(content);

          const inventory = new Inventory({
            productId: product._id,
            sku: product.sku,
            stock: product.stock || 0
          });

          await inventory.save();
          console.log('Inventory record created:', inventory.sku);
        } catch (error) {
          console.error('Error processing message:', error.message);
        }

        channel.ack(message);
      }
    });
  } catch (error) {
    console.error('Consumer error:', error.message);
  }
}

startConsumer();