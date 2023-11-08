package us.dot.its.jpo.ode.api.accessors.reports;


import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.bson.conversions.Bson;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Fields;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

import us.dot.its.jpo.conflictmonitor.monitor.models.events.broadcast_rate.MapBroadcastRateEvent;
import us.dot.its.jpo.ode.api.ConflictMonitorApiProperties;
import us.dot.its.jpo.ode.api.models.ReportDocument;



@Component
public class ReportRepositoryImpl implements ReportRepository{

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    ConflictMonitorApiProperties props;

    private String collectionName = "CmReport";

    @Override
    public Query getQuery(String reportName, Integer intersectionID, String roadRegulatorID, Long startTime, Long endTime, boolean includeReportContents, boolean latest) {
        Query query = new Query();

        if(reportName != null){
            query.addCriteria(Criteria.where("reportName").is(reportName));
        }

        if(intersectionID != null){
            query.addCriteria(Criteria.where("intersectionID").is(intersectionID));
        }

        if(roadRegulatorID != null && roadRegulatorID.length() > 0){
            query.addCriteria(Criteria.where("intersectionID").is(intersectionID));
        }

        if(startTime == null){
            startTime = 0L;
        }
        if(endTime == null){
            endTime = Instant.now().toEpochMilli();
        }

        query.addCriteria(Criteria.where("reportGeneratedAt").gte(startTime).lte(endTime));

        if(!includeReportContents){
            query.fields().exclude("reportContents");
        }

        if (latest) {
            query.with(Sort.by(Sort.Direction.DESC, "reportGeneratedAt"));
            query.limit(1);
        }else{
            query.limit(props.getMaximumResponseSize());
        }

        return query;
    }

    @Override
    public long getQueryResultCount(Query query) {
        return mongoTemplate.count(query, ReportDocument.class, collectionName);
    }

    @Override
    public List<ReportDocument> find(Query query) {
        return mongoTemplate.find(query, ReportDocument.class, collectionName);
    }

    @Override
    public void add(ReportDocument item) {
        mongoTemplate.save(item, collectionName);
    }

}
