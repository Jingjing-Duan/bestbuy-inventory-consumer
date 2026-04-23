require('dotenv').config();
const amqp = require('amqplib');
const mongoose = require('mongoose');
const Product = require('./models/Product');

const rabbitmqUrl = process.env.RABBITMQ_URL;
const mongoUri = process.env.MONGO_URI;

const exchangeName = process.env.EXCHANGE_NAME || 'order.created';
const queueName = process.env.QUEUE_NAME || 'inventory.queue';

async function startConsumer() {
  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB connected (inventory)');

    const connection = await amqp.connect(rabbitmqUrl);
    const channel = await connection.createChannel();

    await channel.assertExchange(exchangeName, 'fanout', { durable: true });
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, '');

    console.log('Connected to RabbitMQ');
    console.log(`Waiting for messages in queue: ${queueName}`);

    channel.consume(queueName, async (message) => {
      if (!message) return;

      const content = message.content.toString();
      console.log('Received message:', content);

      try {
        const order = JSON.parse(content);

        if (!order.items || !Array.isArray(order.items)) {
          throw new Error('Invalid order message: items array is missing');
        }

        for (const item of order.items) {
          const updatedProduct = await Product.findOneAndUpdate(
            { sku: item.sku },
            { $inc: { stock: -item.quantity } },
            { new: true }
          );

          if (updatedProduct) {
            console.log(`Stock updated for ${item.sku}: ${updatedProduct.stock}`);
          } else {
            console.log(`Product not found for sku: ${item.sku}`);
          }
        }

        channel.ack(message);
      } catch (error) {
        console.error('Error processing message:', error.message);
        channel.nack(message, false, false);
      }
    });
  } catch (error) {
    console.error('Consumer error:', error.message);
    process.exit(1);
  }
}

startConsumer();