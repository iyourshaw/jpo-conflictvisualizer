package us.dot.its.jpo.ode.api.topologies;

import org.apache.kafka.streams.KafkaStreams;
import org.apache.kafka.streams.StreamsBuilder;
import org.apache.kafka.streams.Topology;
import org.apache.kafka.streams.KafkaStreams.StateListener;
import org.apache.kafka.streams.errors.StreamsUncaughtExceptionHandler;
import org.apache.kafka.streams.kstream.Consumed;
import org.apache.kafka.streams.kstream.KStream;

import us.dot.its.jpo.conflictmonitor.monitor.models.bsm.BsmIntersectionIdKey;
import us.dot.its.jpo.conflictmonitor.monitor.serialization.JsonSerdes;
import us.dot.its.jpo.ode.api.controllers.StompController;
import us.dot.its.jpo.ode.model.OdeBsmData;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Properties;

public class BsmSocketForwardTopology{

    private static final Logger logger = LoggerFactory.getLogger(DataLoaderTopology.class);

    Topology topology;
    KafkaStreams streams;
    String topicName;
    Properties streamsProperties;
    StompController controller;
    ObjectMapper objectMapper;

    public BsmSocketForwardTopology(String topicName, StompController controller, Properties streamsProperties){
        this.topicName = topicName;
        this.streamsProperties = streamsProperties;
        this.controller = controller;
        this.objectMapper = new ObjectMapper();
        this.start();
    }

    
    public void start() {
        if (streams != null && streams.state().isRunningOrRebalancing()) {
            throw new IllegalStateException("Start called while streams is already running.");
        }
        Topology topology = buildTopology();
        streams = new KafkaStreams(topology, streamsProperties);
        if (exceptionHandler != null) streams.setUncaughtExceptionHandler(exceptionHandler);
        if (stateListener != null) streams.setStateListener(stateListener);
        streams.start();
    }

    public Topology buildTopology() {
        StreamsBuilder builder = new StreamsBuilder();

        KStream<BsmIntersectionIdKey, OdeBsmData> inputStream = builder.stream(topicName, Consumed.with(JsonSerdes.BsmIntersectionIdKey(), JsonSerdes.OdeBsm()));

        inputStream.foreach((key, value) -> {
            controller.broadcastBSM(key, value);
        });

        return builder.build();

    }

    public void stop() {
        logger.info("Stopping SPaT Socket Broadcast Topology.");
        if (streams != null) {
            streams.close();
            streams.cleanUp();
            streams = null;
        }
        logger.info("Stopped SPaT Socket Broadcast Topology.");
    }

    StateListener stateListener;
    public void registerStateListener(StateListener stateListener) {
        this.stateListener = stateListener;
    }

    StreamsUncaughtExceptionHandler exceptionHandler;
    public void registerUncaughtExceptionHandler(StreamsUncaughtExceptionHandler exceptionHandler) {
        this.exceptionHandler = exceptionHandler;
    }



}
